// House connectors (2026-09-24, user request): the printed diagnosis keeps the connector lower case
// between capitalised terms, "TUBULAR ADENOMA with LOW GRADE DYSPLASIA", so each capitalised term codes
// separately in SNOMED, and never prints the qualifier phrases in capitals (src/style.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createCase, generate } from '../src/engine.js';
import { houseConnectors } from '../src/style.js';
import { schemaSync } from './_schema.js';

test('houseConnectors: lower-case "with" and its article; qualifier phrases by position; WITHOUT and AND untouched', () => {
  assert.equal(houseConnectors('DUODENUM, D2, biopsy - TUBULAR ADENOMA WITH LOW GRADE DYSPLASIA'), 'DUODENUM, D2, biopsy - TUBULAR ADENOMA with LOW GRADE DYSPLASIA');
  assert.equal(houseConnectors('LYMPH NODE, station 7, EBUS-TBNA - METASTATIC ADENOCARCINOMA, CONSISTENT WITH LUNG PRIMARY'), 'LYMPH NODE, station 7, EBUS-TBNA - METASTATIC ADENOCARCINOMA, consistent with LUNG PRIMARY', 'after a comma: lower case');
  assert.equal(houseConnectors('SKIN, excision - IN KEEPING WITH A DERMATOFIBROMA'), 'SKIN, excision - In keeping with a DERMATOFIBROMA', 'opening a clause: sentence case');
  assert.equal(houseConnectors('CONSISTENT WITH X\n- COMPATIBLE with Y'), 'Consistent with X\n- Compatible with Y');
  assert.equal(houseConnectors('LUNG, wedge excision x frozen section - ADENOCARCINOMA WITH A LEPIDIC PATTERN'), 'LUNG, wedge excision x frozen section - ADENOCARCINOMA with a LEPIDIC PATTERN');
  assert.equal(houseConnectors('MUCINOUS CYSTIC NEOPLASM WITH AN ASSOCIATED INVASIVE CARCINOMA'), 'MUCINOUS CYSTIC NEOPLASM with an ASSOCIATED INVASIVE CARCINOMA');
  assert.equal(houseConnectors('INVASIVE FUNGAL SINUSITIS WITH ANGIOINVASION'), 'INVASIVE FUNGAL SINUSITIS with ANGIOINVASION', '"AN" inside a word is not an article');
  assert.equal(houseConnectors('UTERUS WITHOUT CERVIX AND ADNEXA'), 'UTERUS WITHOUT CERVIX AND ADNEXA');
  const sentence = 'Stomach, antrum, biopsy - Chronic gastritis with erosion, consistent with NSAID effect';
  assert.equal(houseConnectors(sentence), sentence, 'sentence-case lines are unchanged');
});

test('every template and every option value: no capital "WITH" and no capital qualifier phrase in the diagnosis', async () => {
  const manifest = JSON.parse(fs.readFileSync(new URL('../templates/manifest.json', import.meta.url), 'utf8'));
  const bad = /\bWITH\b|\b(CONSISTENT|COMPATIBLE|IN KEEPING) with\b|\bwith AN?\b/;
  let runs = 0;
  for (const t of manifest.templates) {
    const schema = schemaSync(t.id);
    const gen = await import(`../generators/${schema.generator}.js`);
    const check = (patch, how) => {
      let out;
      try {
        const c = createCase(schema, 1);
        c.parts[0].values = { ...c.parts[0].values, ...patch };
        out = generate(schema, gen, c);
      } catch { return; } // a combination the form cannot produce
      runs++;
      assert.doesNotMatch(out.diagnosis, bad, `${t.id} ${how}: ${out.diagnosis}`);
    };
    check({}, 'defaults');
    for (const f of (schema.fields || []).flatMap((x) => (x.fields ? x.fields : [x]))) {
      for (const o of f.options || []) {
        const v = typeof o === 'string' ? o : o.value ?? o.label;
        check({ [f.id]: f.type === 'multiselect' || f.multi ? [v] : v }, `${f.id}=${v}`);
      }
    }
  }
  assert.ok(runs > 2000, `swept ${runs} diagnoses`);
});

test('a typed diagnosis edit prints as typed', async () => {
  const schema = schemaSync('duodenal_biopsy');
  const gen = await import(`../generators/${schema.generator}.js`);
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, neoplasia: 'Adenoma, low grade dysplasia' };
  assert.match(generate(schema, gen, c).diagnosis, /TUBULAR ADENOMA with LOW GRADE DYSPLASIA/);
  c.edits = { diagnosis: 'DUODENUM, D2, biopsy - TUBULAR ADENOMA WITH LOW GRADE DYSPLASIA' };
  assert.equal(generate(schema, gen, c).diagnosis, 'DUODENUM, D2, biopsy - TUBULAR ADENOMA WITH LOW GRADE DYSPLASIA');
});
