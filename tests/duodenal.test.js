// Phase 4: duodenal biopsy template. Wording is deliberate; update the strings only on purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, generate } from '../src/engine.js';
import { loadAll } from '../src/registry.js';
import { marsh, organPhrase, coeliacClause } from '../generators/duodenal.js';

const registry = await loadAll();
const duo = registry.duodenal_biopsy;
const run = (c) => generate(duo.schema, duo.generator, c);
const example = () => ({ ...JSON.parse(JSON.stringify(duo.schema.example)), schemaId: duo.schema.id });
const one = (values) => {
  const c = createCase(duo.schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  return c;
};

test('template is registered with D2 and bulb defaults', () => {
  assert.ok(duo);
  const c = createCase(duo.schema, 2);
  assert.deepEqual(c.parts.map((p) => p.values.specimenName), ['D2', 'Duodenal bulb']);
});

test('Marsh–Oberhuber derivation and override', () => {
  assert.equal(marsh({ villi: 'Normal', iel: 'Not increased' }), '0');
  assert.equal(marsh({ villi: 'Normal', iel: 'Increased', cryptHyperplasia: 'Absent' }), '1');
  assert.equal(marsh({ villi: 'Normal', iel: 'Increased', cryptHyperplasia: 'Present' }), '2');
  assert.equal(marsh({ villi: 'Mild blunting', iel: 'Increased' }), '3a');
  assert.equal(marsh({ villi: 'Marked blunting', iel: 'Increased' }), '3b');
  assert.equal(marsh({ villi: 'Flat (absent villi)', iel: 'Increased' }), '3c');
  assert.equal(marsh({ villi: 'Marked blunting', iel: 'Not increased' }), null, 'blunting without IELs is outside the scheme');
  assert.equal(marsh({ villi: 'Normal', iel: 'Not increased', marshOverride: '3a' }), '3a');
  assert.equal(marsh({ villi: 'Marked blunting', iel: 'Increased', marshOverride: 'Not stated' }), null);
});

test('organ phrase keeps D-level abbreviations and lower-cases free text', () => {
  const ctx = { schema: duo.schema };
  assert.equal(organPhrase({ values: { specimenName: 'D2' } }, ctx), 'DUODENUM, D2, biopsy');
  assert.equal(organPhrase({ values: { specimenName: 'Duodenal bulb' } }, ctx), 'DUODENUM, bulb, biopsy');
  assert.equal(organPhrase({ values: { specimenName: '' } }, ctx), 'DUODENUM, biopsy');
});

test('default single part is the house normal paragraph with no part letter', () => {
  const out = run(one({}));
  assert.equal(out.specimens, 'Duodenum, D2, biopsy');
  assert.equal(out.microscopy, 'Sections show a piece of duodenal mucosa. The villous and crypt architecture are intact. Intraepithelial lymphocytes are not increased. The lamina propria contains moderate numbers of plasma cells, lymphocytes and eosinophils. Metaplastic changes are absent. No cryptitis, crypt abscess, granuloma, viral cytopathic change or parasite is present. There is no evidence of ulceration, dysplasia or malignancy.');
  assert.equal(out.diagnosis, 'DUODENUM, D2, biopsy - DUODENAL MUCOSA with NO SIGNIFICANT HISTOLOGICAL ABNORMALITY');
});

test('coeliac pattern: Marsh 3b diagnosis, interpretive sentence, and option to suppress it', () => {
  const values = { pieces: '4', villi: 'Marked blunting', iel: 'Increased', ielCount: '45', cryptHyperplasia: 'Present', lpInflammation: 'Increased chronic inflammation' };
  const out = run(one(values));
  assert.equal(out.diagnosis, 'DUODENUM, D2, biopsy - VILLOUS ATROPHY with INTRAEPITHELIAL LYMPHOCYTOSIS AND CRYPT HYPERPLASIA (MARSH 3b), consistent with coeliac disease in the appropriate serological context; no evidence of dysplasia or malignancy');
  assert.match(out.microscopy, /^Sections show 4 pieces of duodenal mucosa\. The villi are markedly blunted, with crypt hyperplasia and a reduced villous to crypt ratio\. Intraepithelial lymphocytes are increased \(approximately 45 per 100 enterocytes\), including at the villous tips\./);
  assert.match(out.microscopy, /consistent with coeliac disease in the appropriate serological context; other causes/);
  const c = one(values);
  c.options.coeliacComment = false;
  assert.doesNotMatch(run(c).microscopy, /consistent with coeliac disease/);
});

test('Marsh 1 and blunting without IELs are flagged with a comment', () => {
  assert.equal(coeliacClause({ villi: 'Normal', iel: 'Increased', cryptHyperplasia: 'Absent' }), 'INCREASED INTRAEPITHELIAL LYMPHOCYTES WITH PRESERVED VILLOUS ARCHITECTURE (MARSH 1); see comment');
  const m1 = run(one({ iel: 'Increased' }));
  assert.match(m1.microscopy, /Correlation with coeliac serology is recommended\./);
  const blunt = run(one({ villi: 'Mild blunting' }));
  assert.equal(blunt.diagnosis, 'DUODENUM, D2, biopsy - VILLOUS BLUNTING WITHOUT INTRAEPITHELIAL LYMPHOCYTOSIS; see comment; no evidence of dysplasia or malignancy');
  assert.match(blunt.microscopy, /not typical of coeliac disease/);
});

test('peptic duodenitis, giardiasis, Helicobacter and adenoma clauses', () => {
  const peptic = run(one({ specimenName: 'Duodenal bulb', brunner: 'Brunner gland hyperplasia', foveolar: 'Present', activity: 'Erosion', hpylori: 'Present' }));
  assert.equal(peptic.diagnosis, 'DUODENUM, bulb, biopsy - ACTIVE PEPTIC DUODENITIS with EROSION; Helicobacter-like organisms present; no evidence of dysplasia or malignancy');
  assert.match(peptic.microscopy, /There is surface erosion with reactive epithelial change and neutrophilic inflammation\. Brunner gland hyperplasia and gastric foveolar metaplasia of the surface epithelium are present\. Helicobacter-like organisms/);
  assert.doesNotMatch(peptic.microscopy, /No cryptitis/);
  assert.match(peptic.microscopy, /There is no evidence of ulceration, dysplasia or malignancy\.$/);

  const giardia = run(one({ giardia: 'Present' }));
  assert.equal(giardia.diagnosis, 'DUODENUM, D2, biopsy - GIARDIASIS; no evidence of dysplasia or malignancy');
  assert.match(giardia.microscopy, /Pear-shaped trophozoites consistent with Giardia/);
  assert.doesNotMatch(giardia.microscopy, /or parasite is present/);

  const adenoma = run(one({ neoplasia: 'Adenoma, low grade dysplasia' }));
  assert.equal(adenoma.diagnosis, 'DUODENUM, D2, biopsy - TUBULAR ADENOMA with LOW GRADE DYSPLASIA');
  assert.match(adenoma.microscopy, /There is no evidence of ulceration\.$/);
});

test('example case renders two parts with a SUMMARY line', () => {
  const out = run(example());
  assert.match(out.specimens, /^\(A\) Duodenal bulb, biopsy\n\(B\) Duodenum, D2, biopsy$/);
  assert.match(out.diagnosis, /\(A\) DUODENUM, bulb, biopsy - ACTIVE PEPTIC DUODENITIS; no evidence of dysplasia or malignancy\n\(B\) DUODENUM, D2, biopsy - VILLOUS ATROPHY/);
  assert.match(out.diagnosis, /\n\nSUMMARY: Highest Marsh.Oberhuber type 3b \(part B\); peptic duodenitis in part A\.$/);
  const c = example();
  c.options.summary = false;
  assert.doesNotMatch(run(c).diagnosis, /SUMMARY/);
});
